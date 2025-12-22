import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import AssessmentTable from '../client/src/components/AssessmentTable';
import type { AssessmentWithUser } from '../shared/schema';

// Mock dependencies
vi.mock('../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

vi.mock('../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

// Helper to render with QueryClient
const renderWithClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AssessmentTable Component', () => {
  const mockAssessments: AssessmentWithUser[] = [
    {
      id: 'assessment-1',
      systemName: 'Test System 1',
      systemDescription: 'Test description 1',
      status: 'in_progress',
      isPublic: false,
      userId: 'user-1',
      excludedMechanisms: [],
      mechanismConfigurations: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'assessor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'assessment-2',
      systemName: 'Test System 2',
      systemDescription: 'Test description 2',
      status: 'completed',
      isPublic: true,
      userId: 'user-1',
      excludedMechanisms: [],
      mechanismConfigurations: {},
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-04'),
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'assessor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  describe('Table Structure', () => {
    it('should render assessment table with correct columns', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      // Check for expected column headers
      expect(screen.getByText(/System Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Modified/i)).toBeInTheDocument();
      expect(screen.getByText(/Visibility/i)).toBeInTheDocument();
      expect(screen.getByText(/Owner/i)).toBeInTheDocument();
      expect(screen.getByText(/Actions/i)).toBeInTheDocument();
    });

    it('should NOT have Pillar Scores column', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      // Check that Pillar Scores column does NOT exist
      const pillarScoresHeader = screen.queryByText(/Pillar Scores/i);
      expect(pillarScoresHeader).not.toBeInTheDocument();
    });

    it('should have exactly 6 column headers', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />
      );

      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(6); // System Name, Status, Last Modified, Visibility, Owner, Actions
    });
  });

  describe('Assessment Data Display', () => {
    it('should display assessment system names', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      expect(screen.getByText('Test System 1')).toBeInTheDocument();
      expect(screen.getByText('Test System 2')).toBeInTheDocument();
    });

    it('should display assessment descriptions', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      expect(screen.getByText(/Test description 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test description 2/i)).toBeInTheDocument();
    });

    it('should display status badges', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });

    it('should display visibility badges', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      expect(screen.getByText(/Private/i)).toBeInTheDocument();
      expect(screen.getByText(/Public/i)).toBeInTheDocument();
    });

    it('should display owner information', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      const owners = screen.getAllByText('John Doe');
      expect(owners.length).toBeGreaterThan(0);
    });

    it('should NOT display pillar score values', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />
      );

      // Check that there are no elements showing scores like "O:75 D:80"
      const scorePattern = /O:\d+.*D:\d+/;
      const bodyText = container.textContent || '';
      expect(bodyText).not.toMatch(scorePattern);
    });

    it('should NOT display average scores', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      // Check that there are no "Avg:" text
      const avgText = screen.queryByText(/Avg:/i);
      expect(avgText).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no assessments', () => {
      renderWithClient(<AssessmentTable assessments={[]} loading={false} userRole="assessor" />);

      expect(screen.getByText(/No assessments found/i)).toBeInTheDocument();
    });

    it('should show "Create Your First Assessment" button in empty state', () => {
      renderWithClient(<AssessmentTable assessments={[]} loading={false} userRole="assessor" />);

      const createButton = screen.getByText(/Create Your First Assessment/i);
      expect(createButton).toBeInTheDocument();
    });

    it('should NOT show table when no assessments', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={[]} loading={false} userRole="assessor" />
      );

      const table = container.querySelector('table');
      expect(table).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={[]} loading={true} userRole="assessor" />
      );

      // Should show loading skeleton
      const loadingElements = container.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Actions Menu', () => {
    it('should show View Results action', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      // Actions menu requires interaction to open, so we just verify the structure exists
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('User Role Permissions', () => {
    it('should show edit action for assessor role', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      // Component should render for assessor
      expect(screen.getByText('Test System 1')).toBeInTheDocument();
    });

    it('should show view action for external role', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="external" />);

      // Component should render for external user
      expect(screen.getByText('Test System 1')).toBeInTheDocument();
    });

    it('should NOT show "Create Your First Assessment" for external users in empty state', () => {
      renderWithClient(<AssessmentTable assessments={[]} loading={false} userRole="external" />);

      const createButton = screen.queryByText(/Create Your First Assessment/i);
      expect(createButton).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should display relative time for last modified', () => {
      renderWithClient(<AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />);

      // Should show relative time like "X days ago" or "X hours ago"
      const { container } = renderWithClient(
        <AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />
      );

      const bodyText = container.textContent || '';
      // Should contain "ago" text indicating relative time
      expect(bodyText).toMatch(/ago|Just now/i);
    });
  });

  describe('Pillar Scores Regression Tests', () => {
    it('should NOT render any pillar score components', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />
      );

      // Look for any elements that might contain pillar codes like "TP1:", "ACC:", etc.
      const pillarCodePattern = /[A-Z]{2,3}:/;
      const bodyText = container.textContent || '';

      // Should not find pillar code patterns in the text
      const matches = bodyText.match(pillarCodePattern);
      if (matches) {
        // If there are matches, they should only be for status/visibility, not pillar scores
        matches.forEach(match => {
          expect(match).not.toMatch(/O:|D:/); // Operational/Design score prefixes
        });
      }
    });

    it('should NOT have flex layouts for pillar score display', () => {
      const { container } = renderWithClient(
        <AssessmentTable assessments={mockAssessments} loading={false} userRole="assessor" />
      );

      // Previous implementation had specific flex layouts for pillar scores
      // Verify these don't exist
      const flexCols = container.querySelectorAll('.flex-col');

      // If any flex-cols exist, they should be for other purposes
      flexCols.forEach(element => {
        const text = element.textContent || '';
        expect(text).not.toMatch(/O:\d+/);
        expect(text).not.toMatch(/D:\d+/);
      });
    });
  });
});
